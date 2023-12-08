import Button, { ButtonType } from "components/Elements/Buttonv2";
import Input from "components/Elements/Inputv2";
import searchIconImage from "./svg/search-icon.svg";
import threeDotsIconImage from "./svg/three-dots-icon.svg";
import emptyDataImage from "./svg/empty-data.svg";
import React, { DragEvent, Fragment, useEffect, useState } from "react";
import Table from "components/Tablev2";
import { format } from "date-fns";
import { Menu, Transition } from "@headlessui/react";
import ApiService from "services/api.service";
import { useNavigate } from "react-router-dom";
import Pagination from "components/Pagination";
import { toast } from "react-toastify";
import { useDebounce } from "react-use";
import sortAscChevronsImage from "./svg/sort-asc-chevrons.svg";
import sortDescChevronsImage from "./svg/sort-desc-chevrons.svg";
import sortNoneChevronsImage from "./svg/sort-none-chevrons.svg";
import NamePersonModal from "./Modals/NamePersonModal";
import AutoComplete from "components/AutoCompletev2";
import TokenService from "../../services/token.service";
import Progress from "components/Progress";

interface PeopleRowData {
  id: string;
  email?: string;
  createdAt: string;
}

enum SortProperty {
  CREATED_AT = "createdAt",
}

enum SortType {
  ASC = "asc",
  DESC = "desc",
}

interface SortOptions {
  sortBy: SortProperty;
  sortType: SortType;
}

const PeopleTablev2 = () => {
  const navigate = useNavigate();

  const [isFirstRender, setIsFirstRender] = useState(true);
  const [isNamePersonModalOpen, setIsNamePersonModalOpen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchKey, setSearchKey] = useState("");
  const [searchValue, setSearchValue] = useState("");
  const [rows, setRows] = useState<PeopleRowData[]>([]);
  const [sortOptions, setSortOptions] = useState<SortOptions>({
    sortBy: SortProperty.CREATED_AT,
    sortType: SortType.DESC,
  });
  const [possibleKeys, setPossibleKeys] = useState<string[]>([]);
  const [keysQuery, setKeysQuery] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const [pagesCount, setPagesCount] = useState(1);
  const [isCSVImportModalOpen, setIsCSVImportModalOpen] = useState(false);
  const [isCSVDragActive, setIsCSVDragActive] = useState(false);
  const [isCSVLoading, setIsCSVLoading] = useState(false);

  const ITEMS_PER_PAGE = 5;

  const loadData = async () => {
    setIsLoading(true);
    try {
      const {
        data: { data, totalPages },
      } = await ApiService.get<{
        data: { id: string; email?: string; createdAt: string }[];
        totalPages: number;
      }>({
        url: `/customers?take=${ITEMS_PER_PAGE}&skip=${
          (currentPage - 1) * ITEMS_PER_PAGE
        }&searchKey=${searchKey}&searchValue=${searchValue}&orderBy=${
          sortOptions.sortBy
        }&orderType=${sortOptions.sortType}`,
      });

      setRows(
        data.map((person) => ({
          id: person.id,
          email: person.email,
          createdAt: person.createdAt,
        }))
      );
      setPagesCount(totalPages);
      setIsLoaded(true);
    } catch (e) {
      toast.error("Failed to load data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentPage, sortOptions]);

  useDebounce(
    () => {
      if (isFirstRender) {
        setIsFirstRender(false);
        return;
      }

      loadData();
    },
    500,
    [searchKey, searchValue]
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [sortOptions, searchKey, searchValue]);

  useEffect(() => {
    setSearchKey("");
    setSearchValue("");
  }, [showSearch]);

  const loadPossibleKeys = async (q: string) => {
    const { data } = await ApiService.get<
      {
        key: string;
      }[]
    >({
      url: `/customers/possible-attributes?key=${q}&isArray=false`,
    });

    setPossibleKeys(data.map((item) => item.key));
  };

  useDebounce(
    () => {
      loadPossibleKeys(keysQuery);
    },
    100,
    [keysQuery]
  );

  const handleDeletePerson = async (id: string) => {
    await ApiService.post({ url: "/customers/delete/" + id });
    await loadData();
  };

  const handleCSVFile = async (file: File) => {
    if (file.type !== "text/csv") {
      toast.error("File must have .csv extension");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    setIsCSVLoading(true);
    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_BASE_URL}/customers/importcsv`,
        {
          method: "POST",
          body: formData,
          headers: {
            Authorization: `Bearer ${TokenService.getLocalAccessToken()}`,
          },
        }
      );

      if (!res.ok) throw new Error("Error while loading csv");
      const {
        stats: { created, updated, skipped },
      } = await res.json();

      toast.success(
        `Successfully loaded your customer from csv file.\nCreated: ${created}.\nUpdated: ${updated}.\nSkipped: ${skipped}`
      );
    } catch (e) {
      console.error(e);
      if (e instanceof Error) toast.error(e.message);
    } finally {
      setIsCSVLoading(false);
      setIsCSVImportModalOpen(false);
      await loadData();
    }
  };

  const handleDrag = function (e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsCSVDragActive(true);
    } else if (e.type === "dragleave") {
      setIsCSVDragActive(false);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsCSVDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      handleCSVFile(file);
    }
  };

  return (
    <>
      {isCSVImportModalOpen && (
        <>
          <div
            className="absolute w-full h-screen bg-black opacity-20 z-[119]"
            onClick={() => setIsCSVImportModalOpen(false)}
          />
          <div className="fixed z-[121] w-[70%] h-[300px] rounded-lg bg-white top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-100">
            {isCSVLoading ? (
              <Progress />
            ) : (
              <div
                className="relative flex items-center justify-center w-full h-full p-[2px]"
                onDragEnter={handleDrag}
              >
                <label
                  htmlFor="dropzone-file"
                  className={`flex flex-col items-center justify-center w-full h-full border-2 ${
                    isCSVDragActive ? "border-cyan-300" : "border-gray-300"
                  } border-dashed rounded-lg cursor-pointer bg-gray-50 dark:hover:bg-bray-800 dark:bg-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:hover:border-gray-500 dark:hover:bg-gray-600`}
                >
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <svg
                      aria-hidden="true"
                      className="w-10 h-10 mb-3 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                      ></path>
                    </svg>
                    <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                      <span className="font-semibold">Click to upload</span> or
                      drag and drop
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 px-[10px] inline-block">
                      Your csv should include one of these fields, email, sms,
                      slackId. For personalization include First Name, and Last
                      Name and other fields
                    </p>
                  </div>
                  <input
                    id="dropzone-file"
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleCSVFile(e.target.files[0]);
                      }
                    }}
                  />
                </label>
                {isCSVDragActive && (
                  <div
                    className="absolute w-full h-full top-0 right-0 bottom-0 left-0"
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                  ></div>
                )}
              </div>
            )}
          </div>
        </>
      )}
      <div className="p-[20px] flex flex-col gap-[20px] font-inter font-normal text-[14px] text-[#111827] leading-[22px]">
        <div className="flex justify-between items-center">
          <div className="text-[20px] font-semibold leading-[28px]">User</div>

          <div className="flex items-center gap-[10px]">
            <Button
              type={ButtonType.SECONDARY}
              onClick={() => setIsCSVImportModalOpen(true)}
            >
              Import Customer
            </Button>
            <Button
              type={ButtonType.PRIMARY}
              onClick={() => setIsNamePersonModalOpen(true)}
              id="create-customer-button"
            >
              Create customer
            </Button>
          </div>
        </div>
        <div className="p-[20px] bg-white rounded-[8px] flex flex-col gap-[20px]">
          {rows.length === 0 &&
          searchKey === "" &&
          searchValue === "" &&
          isLoaded ? (
            <div className="w-full h-[300px] flex items-center justify-center select-none">
              <div className="flex flex-col items-center gap-[20px]">
                <img src={emptyDataImage} />

                <div className="font-inter text-[16px] font-semibold leading-[24px] text-[#4B5563]">
                  Import or Create Customers to Get Started
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="flex justify-end items-center">
                {showSearch ? (
                  <div className="flex gap-[10px] items-center">
                    <AutoComplete
                      value={searchKey}
                      onQueryChange={(q) => {
                        setSearchKey(q);
                        setKeysQuery(q);
                      }}
                      onSelect={(value) => {
                        setSearchKey(value);
                        setKeysQuery(value);
                      }}
                      includedItems={{
                        type: "getter",
                        items: possibleKeys.map((item) => item),
                      }}
                      retrieveLabel={(item) => item}
                      getKey={(value) => value}
                      placeholder="Customer key"
                    />

                    <Input
                      value={searchValue}
                      onChange={setSearchValue}
                      placeholder="Type the value to search"
                      showClearButton
                    />

                    <Button
                      type={ButtonType.LINK}
                      onClick={() => setShowSearch(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <button onClick={() => setShowSearch(true)}>
                    <img src={searchIconImage} />
                  </button>
                )}
              </div>

              <Table
                isLoading={isLoading}
                headings={[
                  <div className="px-[20px] py-[10px] select-none">ID</div>,
                  <div className="px-[20px] py-[10px] select-none">Email</div>,
                  <div
                    className="px-[20px] py-[10px] select-none flex gap-[2px] items-center cursor-pointer"
                    onClick={() => {
                      if (sortOptions.sortBy !== SortProperty.CREATED_AT) {
                        setSortOptions({
                          sortBy: SortProperty.CREATED_AT,
                          sortType: SortType.DESC,
                        });

                        return;
                      }

                      if (sortOptions.sortType === SortType.ASC) {
                        setSortOptions({
                          sortBy: SortProperty.CREATED_AT,
                          sortType: SortType.DESC,
                        });

                        return;
                      }

                      setSortOptions({
                        sortBy: SortProperty.CREATED_AT,
                        sortType: SortType.ASC,
                      });
                    }}
                  >
                    <div>Created</div>
                    <div>
                      <img
                        src={
                          sortOptions.sortBy === SortProperty.CREATED_AT
                            ? sortOptions.sortType === SortType.ASC
                              ? sortAscChevronsImage
                              : sortDescChevronsImage
                            : sortNoneChevronsImage
                        }
                      />
                    </div>
                  </div>,
                  ,
                  <div className="px-[20px] py-[10px] select-none"></div>,
                ]}
                rows={rows.map((row) => [
                  <button
                    className="text-[#6366F1]"
                    onClick={() => navigate(`/person/${row.id}`)}
                  >
                    {row.id}
                  </button>,
                  <div>{row.email}</div>,
                  <div>
                    {format(new Date(row.createdAt), "MM/dd/yyyy HH:mm")}
                  </div>,
                  <Menu as="div" className="relative">
                    <Menu.Button>
                      <button className="px-[5px] py-[11px] rounded-[4px]">
                        <img src={threeDotsIconImage} />
                      </button>
                    </Menu.Button>
                    <Transition
                      as={Fragment}
                      enter="transition ease-out duration-100"
                      enterFrom="transform opacity-0 scale-95"
                      enterTo="transform opacity-100 scale-100"
                      leave="transition ease-in duration-75"
                      leaveFrom="transform opacity-100 scale-100"
                      leaveTo="transform opacity-0 scale-95"
                    >
                      <Menu.Items className="absolute z-[120] right-0 origin-top-right w-[200px] py-[4px] rounded-[2px] bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                        <Menu.Item>
                          {({ active }) => (
                            <button
                              className={`block w-full text-left py-[5px] px-[12px] text-[#F43F5E] ${
                                active ? "bg-[#F3F4F6]" : ""
                              }`}
                              onClick={() => handleDeletePerson(row.id)}
                            >
                              Delete
                            </button>
                          )}
                        </Menu.Item>
                      </Menu.Items>
                    </Transition>
                  </Menu>,
                ])}
              />
            </>
          )}

          {pagesCount > 1 && (
            <div className="flex justify-center items-center">
              <Pagination
                currentPage={currentPage}
                setCurrentPage={setCurrentPage}
                totalPages={pagesCount}
              />
            </div>
          )}
        </div>

        <NamePersonModal
          isOpen={isNamePersonModalOpen}
          onClose={() => setIsNamePersonModalOpen(false)}
        />
      </div>
    </>
  );
};

export default PeopleTablev2;
